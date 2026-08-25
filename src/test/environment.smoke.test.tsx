import { render, screen } from '@testing-library/react';

// Sanity check temporal (Paso 1 del enunciado): confirma que jsdom, los
// matchers de jest-dom y el pipeline de Vitest + RTL funcionan antes de
// escribir tests reales. Se borra en el Paso 3, cuando ya existan tests
// reales sobre cartReducer.
describe('entorno de testing', () => {
  it('renderiza en jsdom y jest-dom reconoce el DOM', () => {
    render(<p>hola mundo</p>);

    expect(screen.getByText('hola mundo')).toBeInTheDocument();
  });
});
